// Design token conversions from the hi-fi prototype (oklch → hex approximations)
export const Colors = {
  paper:      '#FAF7F0',
  paper2:     '#F3EEDF',
  paper3:     '#E9E3D0',
  ink:        '#1A1714',
  ink2:       '#4A4640',
  ink3:       '#8A8377',
  ink4:       '#B8B1A1',
  line:       '#E0D9C5',
  line2:      '#C9C2AC',
  bg:         '#ECE7D8',

  accent:     '#C45E38',   // oklch(0.62 0.15 35) — terracotta
  accentSoft: '#F8EDE5',   // oklch(0.94 0.04 40)
  accentInk:  '#8A3A1A',   // oklch(0.45 0.13 35)

  success:    '#47895A',   // oklch(0.58 0.12 145)
  successSoft:'#E2F2E8',   // oklch(0.94 0.04 145)
  successInk: '#2A5E3A',   // oklch(0.40 0.12 145)

  negative:   '#B84030',   // oklch(0.55 0.15 25)

  // Avatar palette: [background, text] — 8 deterministic tones
  avatarTones: [
    ['#F0E8C8', '#685520'],  // 1 warm yellow
    ['#C8EDE8', '#1A5E58'],  // 2 teal
    ['#DEC8F0', '#4A1A6E'],  // 3 purple
    ['#CCF0D2', '#1A5E2A'],  // 4 green
    ['#F0D8C8', '#6E2A1A'],  // 5 orange
    ['#C8D8F0', '#1A2A6E'],  // 6 blue
    ['#E0F0C8', '#405E1A'],  // 7 yellow-green
    ['#F0C8E8', '#6E1A60'],  // 8 pink
  ] as [string, string][],
} as const;

export const Fonts = {
  regular:    'Inter_400Regular',
  medium:     'Inter_500Medium',
  semiBold:   'Inter_600SemiBold',
  bold:       'Inter_700Bold',
  mono:       'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
  caveat:     'Caveat_600SemiBold',
} as const;
