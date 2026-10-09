// Tema de shadcn/ui con la paleta de Pepe El Andaluz. Los valores viven como
// variables en src/index.css: se cambian ahí y se actualiza toda la app.
import animate from 'tailwindcss-animate'

export default {
    darkMode: ['class'],
    content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
  	extend: {
  		colors: {
  			border: 'hsl(var(--border) / <alpha-value>)',
  			input: 'hsl(var(--input) / <alpha-value>)',
  			ring: 'hsl(var(--ring) / <alpha-value>)',
  			background: 'hsl(var(--background) / <alpha-value>)',
  			foreground: 'hsl(var(--foreground) / <alpha-value>)',
  			primary: {
  				DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
  				foreground: 'hsl(var(--primary-foreground) / <alpha-value>)'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
  				foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
  				foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
  				foreground: 'hsl(var(--muted-foreground) / <alpha-value>)'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
  				foreground: 'hsl(var(--accent-foreground) / <alpha-value>)'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover) / <alpha-value>)',
  				foreground: 'hsl(var(--popover-foreground) / <alpha-value>)'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card) / <alpha-value>)',
  				foreground: 'hsl(var(--card-foreground) / <alpha-value>)'
  			},
  			higo: 'hsl(var(--higo) / <alpha-value>)',
  			lavanda: 'hsl(var(--lavanda) / <alpha-value>)',
  			oro: 'hsl(var(--oro) / <alpha-value>)',
  			azafran: 'hsl(var(--azafran) / <alpha-value>)',
  			pimenton: 'hsl(var(--pimenton) / <alpha-value>)',
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background) / <alpha-value>)',
  				foreground: 'hsl(var(--sidebar-foreground) / <alpha-value>)',
  				primary: 'hsl(var(--sidebar-primary) / <alpha-value>)',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground) / <alpha-value>)',
  				accent: 'hsl(var(--sidebar-accent) / <alpha-value>)',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground) / <alpha-value>)',
  				border: 'hsl(var(--sidebar-border) / <alpha-value>)',
  				ring: 'hsl(var(--sidebar-ring) / <alpha-value>)'
  			}
  		},
  		fontFamily: {
  			sans: [
  				'Inter',
  				'system-ui',
  				'-apple-system',
  				'sans-serif'
  			],
  			display: [
  				'"Space Grotesk"',
  				'Inter',
  				'sans-serif'
  			]
  		},
  		fontSize: {
  			'2xs': [
  				'var(--text-2xs)',
  				{
  					lineHeight: '1.35'
  				}
  			],
  			xs: [
  				'var(--text-xs)',
  				{
  					lineHeight: '1.4'
  				}
  			],
  			sm: [
  				'var(--text-sm)',
  				{
  					lineHeight: '1.45'
  				}
  			],
  			base: [
  				'var(--text-base)',
  				{
  					lineHeight: '1.5'
  				}
  			],
  			lg: [
  				'var(--text-lg)',
  				{
  					lineHeight: '1.4'
  				}
  			],
  			xl: [
  				'var(--text-xl)',
  				{
  					lineHeight: '1.3'
  				}
  			],
  			'2xl': [
  				'var(--text-2xl)',
  				{
  					lineHeight: '1.25'
  				}
  			],
  			'3xl': [
  				'var(--text-3xl)',
  				{
  					lineHeight: '1.15'
  				}
  			]
  		},
  		borderRadius: {
  			sm: 'var(--radius-sm)',
  			md: 'var(--radius-md)',
  			lg: 'var(--radius-lg)',
  			xl: 'var(--radius-lg)',
  			full: 'var(--radius-full)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [animate],
}
