-- Extends get_ticket_stats() (see the add_get_ticket_stats_function migration) with a
-- category breakdown: count + percentage for each TicketCategory plus unclassified, over the
-- same non-hidden-status ticket set used for total_tickets.
CREATE OR REPLACE FUNCTION get_ticket_stats()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  total_tickets INTEGER;
  open_tickets INTEGER;
  ai_resolved_tickets INTEGER;
  average_resolution_seconds DOUBLE PRECISION;
  tickets_per_day JSON;
  category_breakdown JSON;
  today_utc DATE := (timezone('UTC', now()))::date;
  range_start DATE := (timezone('UTC', now()))::date - 29;
BEGIN
  SELECT COUNT(*) INTO total_tickets
  FROM "Ticket"
  WHERE status NOT IN ('NEW', 'PROCESSING');

  SELECT COUNT(*) INTO open_tickets
  FROM "Ticket"
  WHERE status = 'OPEN';

  SELECT COUNT(*) INTO ai_resolved_tickets
  FROM "Ticket" t
  WHERE t.status = 'RESOLVED'
    AND EXISTS (SELECT 1 FROM "Reply" r WHERE r."ticketId" = t.id AND r."senderType" = 'AI');

  SELECT AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt"))) INTO average_resolution_seconds
  FROM "Ticket"
  WHERE "resolvedAt" IS NOT NULL;

  -- "createdAt" is stored as timestamp-without-time-zone but written/read as UTC wall-clock, so
  -- bucketing directly on ::date (no AT TIME ZONE conversion) matches that convention; today_utc/
  -- range_start are anchored to UTC explicitly since the session timezone may differ.
  SELECT json_agg(
    json_build_object('date', to_char(d::date, 'YYYY-MM-DD'), 'count', COALESCE(c.count, 0))
    ORDER BY d
  ) INTO tickets_per_day
  FROM generate_series(range_start, today_utc, INTERVAL '1 day') AS d
  LEFT JOIN (
    SELECT "createdAt"::date AS day, COUNT(*) AS count
    FROM "Ticket"
    WHERE "createdAt"::date >= range_start
    GROUP BY "createdAt"::date
  ) c ON c.day = d::date;

  SELECT json_agg(
    json_build_object(
      'category', b.category,
      'count', b.count,
      'percentage', CASE WHEN total_tickets > 0 THEN round(b.count * 100.0 / total_tickets, 1) ELSE 0 END
    )
  ) INTO category_breakdown
  FROM (
    SELECT COALESCE(category::text, 'UNCLASSIFIED') AS category, COUNT(*) AS count
    FROM "Ticket"
    WHERE status NOT IN ('NEW', 'PROCESSING')
    GROUP BY COALESCE(category::text, 'UNCLASSIFIED')
  ) b;

  RETURN json_build_object(
    'totalTickets', total_tickets,
    'openTickets', open_tickets,
    'aiResolvedTickets', ai_resolved_tickets,
    'averageResolutionSeconds', average_resolution_seconds,
    'ticketsPerDay', tickets_per_day,
    'categoryBreakdown', COALESCE(category_breakdown, '[]'::json)
  );
END;
$$;
