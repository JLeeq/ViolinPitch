/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./frontend/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'trajan': ['Cinzel', 'serif'],
        'trajan-decorative': ['Cinzel Decorative', 'serif'],
      },
      colors: {
        // 어두운 갈색 배경 (이미지의 따뜻한 브라운 톤)
        brown: {
          50: '#F5F1EB',
          100: '#E8DDD0',
          200: '#D4C4B0',
          300: '#B8A088',
          400: '#9C7C60',
          500: '#7D5F47',
          600: '#5C4A3A',
          700: '#4A3A2A',
          800: '#3D2E1F',
          900: '#2A1F15',
        },
        // 악센트 컬러 (이미지의 따뜻한 색상)
        accent: {
          green: '#66BB6A',
          orange: '#FF8A65',
          yellow: '#FFD54F',
          purple: '#BA68C8',
        },
        // 기존 호환성을 위한 별칭
        cream: '#F5F1EB',
        beige: {
          100: '#E8DDD0',
          200: '#D4C4B0',
          300: '#B8A088',
        },
        softblue: {
          100: '#BA68C8',
          200: '#9C27B0',
          300: '#7B1FA2',
          400: '#66BB6A',
        },
      },
    },
  },
  plugins: [],
}


