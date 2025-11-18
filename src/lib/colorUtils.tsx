// @ts-nocheck

// Color code to name mapping
export const getColorName = (colorCode: string): string => {
  const colorCodeMap: Record<string, string> = {
    // Common color codes to names
    '#FF0000': 'Red',
    '#0000FF': 'Blue', 
    '#00FF00': 'Green',
    '#FFFF00': 'Yellow',
    '#800080': 'Purple',
    '#FFC0CB': 'Pink',
    '#FFA500': 'Orange',
    '#000000': 'Black',
    '#FFFFFF': 'White',
    '#808080': 'Gray',
    '#8B4513': 'Brown',
    '#F5F5DC': 'Cream',
    '#FFD700': 'Gold',
    '#C0C0C0': 'Silver',
    '#800000': 'Maroon',
    '#000080': 'Navy',
    '#008080': 'Teal',
    '#00FFFF': 'Cyan',
    '#00FF00': 'Lime',
    '#4B0082': 'Indigo',
    '#8A2BE2': 'Violet',
    '#FF69B4': 'Rose',
    '#50C878': 'Emerald',
    '#FFBF00': 'Amber',
    
    // Common color names (in case they're already names)
    'red': 'Red',
    'blue': 'Blue',
    'green': 'Green',
    'yellow': 'Yellow',
    'purple': 'Purple',
    'pink': 'Pink',
    'orange': 'Orange',
    'black': 'Black',
    'white': 'White',
    'gray': 'Gray',
    'grey': 'Gray',
    'brown': 'Brown',
    'cream': 'Cream',
    'gold': 'Gold',
    'silver': 'Silver',
    'maroon': 'Maroon',
    'navy': 'Navy',
    'teal': 'Teal',
    'cyan': 'Cyan',
    'lime': 'Lime',
    'indigo': 'Indigo',
    'violet': 'Violet',
    'rose': 'Rose',
    'emerald': 'Emerald',
    'amber': 'Amber',
    
    // Additional common color variations
    'burgundy': 'Burgundy',
    'navy blue': 'Navy Blue',
    'parrot green': 'Parrot Green',
    'royal blue': 'Royal Blue',
    'forest green': 'Forest Green',
    'sky blue': 'Sky Blue',
    'coral': 'Coral',
    'turquoise': 'Turquoise',
    'magenta': 'Magenta',
    'lavender': 'Lavender',
    'beige': 'Beige',
    'tan': 'Tan',
    'olive': 'Olive',
    'mint': 'Mint',
    'peach': 'Peach',
    'salmon': 'Salmon',
    'plum': 'Plum',
    'charcoal': 'Charcoal',
    'ivory': 'Ivory',
    'khaki': 'Khaki',
    'crimson': 'Crimson',
    'scarlet': 'Scarlet',
    'ruby': 'Ruby',
    'sapphire': 'Sapphire',
    'emerald': 'Emerald',
    'topaz': 'Topaz',
    'amethyst': 'Amethyst',
    'jade': 'Jade',
    'coral': 'Coral',
    'aqua': 'Aqua',
    'fuchsia': 'Fuchsia',
    'lime green': 'Lime Green',
    'dark blue': 'Dark Blue',
    'light blue': 'Light Blue',
    'dark green': 'Dark Green',
    'light green': 'Light Green',
    'dark red': 'Dark Red',
    'light red': 'Light Red',
    'dark purple': 'Dark Purple',
    'light purple': 'Light Purple',
    'dark gray': 'Dark Gray',
    'light gray': 'Light Gray',
    'dark brown': 'Dark Brown',
    'light brown': 'Light Brown',
  };
  
  // Normalize the input
  const normalizedColor = colorCode.toLowerCase().trim();
  
  // Return mapped name or original if not found
  return colorCodeMap[normalizedColor] || colorCode;
};

// Shared utility for color display across the application
export const getColorDisplay = (colorName: string) => {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    red: { bg: 'bg-red-500', text: 'text-white', border: 'border-red-600' },
    blue: { bg: 'bg-blue-500', text: 'text-white', border: 'border-blue-600' },
    green: { bg: 'bg-green-500', text: 'text-white', border: 'border-green-600' },
    yellow: { bg: 'bg-yellow-500', text: 'text-black', border: 'border-yellow-600' },
    purple: { bg: 'bg-purple-500', text: 'text-white', border: 'border-purple-600' },
    pink: { bg: 'bg-pink-500', text: 'text-white', border: 'border-pink-600' },
    orange: { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-600' },
    black: { bg: 'bg-black', text: 'text-white', border: 'border-gray-800' },
    white: { bg: 'bg-white', text: 'text-black', border: 'border-gray-300' },
    gray: { bg: 'bg-gray-500', text: 'text-white', border: 'border-gray-600' },
    brown: { bg: 'bg-amber-800', text: 'text-white', border: 'border-amber-900' },
    cream: { bg: 'bg-amber-100', text: 'text-black', border: 'border-amber-200' },
    gold: { bg: 'bg-yellow-400', text: 'text-black', border: 'border-yellow-500' },
    silver: { bg: 'bg-gray-300', text: 'text-black', border: 'border-gray-400' },
    maroon: { bg: 'bg-red-800', text: 'text-white', border: 'border-red-900' },
    navy: { bg: 'bg-blue-900', text: 'text-white', border: 'border-blue-950' },
    teal: { bg: 'bg-teal-500', text: 'text-white', border: 'border-teal-600' },
    cyan: { bg: 'bg-cyan-500', text: 'text-white', border: 'border-cyan-600' },
    lime: { bg: 'bg-lime-500', text: 'text-black', border: 'border-lime-600' },
    indigo: { bg: 'bg-indigo-500', text: 'text-white', border: 'border-indigo-600' },
    violet: { bg: 'bg-violet-500', text: 'text-white', border: 'border-violet-600' },
    rose: { bg: 'bg-rose-500', text: 'text-white', border: 'border-rose-600' },
    emerald: { bg: 'bg-emerald-500', text: 'text-white', border: 'border-emerald-600' },
    amber: { bg: 'bg-amber-500', text: 'text-black', border: 'border-amber-600' },
    multicolor: { bg: 'bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500', text: 'text-white', border: 'border-gray-400' },
  };
  
  const normalizedColor = colorName.toLowerCase().trim();
  return colorMap[normalizedColor] || { bg: 'bg-gray-200', text: 'text-black', border: 'border-gray-300' };
};

// Color picker component for forms
export const ColorCircle = ({ 
  color, 
  isSelected = false, 
  size = "w-6 h-6",
  showBorder = true 
}: { 
  color: string; 
  isSelected?: boolean; 
  size?: string;
  showBorder?: boolean;
}) => {
  const colorDisplay = getColorDisplay(color);
  
  let className = `${size} rounded-full ${colorDisplay.bg}`;
  
  if (showBorder) {
    const borderColor = isSelected ? 'border-gray-800' : colorDisplay.border;
    className += ` border-2 ${borderColor}`;
  }
  
  if (isSelected) {
    className += ' ring-2 ring-offset-2 ring-gray-800';
  }
  
  return (
    <div 
      className={className}
      title={color}
    />
  );
};
