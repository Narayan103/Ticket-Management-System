import { MoonIcon, SunIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/lib/use-theme'

function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </Button>
  )
}

export default ThemeToggle
