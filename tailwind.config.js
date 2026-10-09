// Tema de shadcn/ui con la paleta de Pepe El Andaluz. Los valores viven como
// variables en src/index.css: se cambian ahí y se actualiza toda la app.
import animate from 'tailwindcss-animate'

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        // Paleta de marca por nombre, para usarla directo (bg-higo, text-pimenton…).
        higo: 'hsl(var(--higo))',
        lavanda: 'hsl(var(--lavanda))',
        oro: 'hsl(var(--oro))',
        azafran: 'hsl(var(--azafran))',
        pimenton: 'hsl(var(--pimenton))',
      },
      // Una sola escala de letra para toda la app (en rem: 1rem = 16px).
      fontSize: {
        '2xs': ['var(--text-2xs)', { lineHeight: '1.35' }],
        xs: ['var(--text-xs)', { lineHeight: '1.4' }],
        sm: ['var(--text-sm)', { lineHeight: '1.45' }],
        base: ['var(--text-base)', { lineHeight: '1.5' }],
        lg: ['var(--text-lg)', { lineHeight: '1.4' }],
        xl: ['var(--text-xl)', { lineHeight: '1.3' }],
        '2xl': ['var(--text-2xl)', { lineHeight: '1.25' }],
        '3xl': ['var(--text-3xl)', { lineHeight: '1.15' }],
      },
      // Tres redondeos (más el de píldora).
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-lg)',
        full: 'var(--radius-full)',
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [animate],
}
