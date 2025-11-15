'use client';

import { Button } from '@/components/ui/button';
import { useAccessibility } from '@/context/AccessibilityContext';
import { Sun, Moon, ZoomIn, ZoomOut, RotateCcw, Settings2 } from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AccessibilityControlsProps {
  className?: string;
}

export function AccessibilityControls({ className = "fixed bottom-4 right-4 z-50" }: AccessibilityControlsProps = {}) {
  const {
    highContrast,
    toggleHighContrast,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
    darkMode,
    toggleDarkMode,
  } = useAccessibility();

  return (
    <div className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            size="icon" 
            variant="outline" 
            className="bg-background text-foreground hover:bg-muted border-border shadow-md transition-all duration-300 hover:shadow-lg"
            aria-label="Settings"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="p-2">
          <DropdownMenuLabel className="text-center">Accessibility Options</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={toggleDarkMode} className="cursor-pointer transition-colors hover:bg-muted">
            <div className="flex items-center justify-between w-full">
              <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
              {darkMode ? <Sun className="h-4 w-4 ml-2 text-yellow-400" /> : <Moon className="h-4 w-4 ml-2 text-purple-600" />}
            </div>
          </DropdownMenuItem>
          <div className="px-2 py-1 text-xs text-muted-foreground">
            Theme toggle also available in navbar
          </div>
          
          <DropdownMenuItem onClick={toggleHighContrast} className="cursor-pointer transition-colors hover:bg-muted">
            <div className="flex items-center justify-between w-full">
              <span>{highContrast ? 'Standard Contrast' : 'High Contrast'}</span>
              <span className={`ml-2 h-4 w-4 rounded-full ${highContrast ? 'bg-yellow-400' : 'bg-gray-400'}`}></span>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={increaseFontSize} className="cursor-pointer transition-colors hover:bg-muted">
            <div className="flex items-center">
              <span>Increase Font Size</span>
              <ZoomIn className="h-4 w-4 ml-2" />
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={decreaseFontSize} className="cursor-pointer transition-colors hover:bg-muted">
            <div className="flex items-center">
              <span>Decrease Font Size</span>
              <ZoomOut className="h-4 w-4 ml-2" />
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={resetFontSize} className="cursor-pointer transition-colors hover:bg-muted">
            <div className="flex items-center">
              <span>Reset Font Size</span>
              <RotateCcw className="h-4 w-4 ml-2" />
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
} 