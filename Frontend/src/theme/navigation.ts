import { DarkTheme } from 'expo-router/react-navigation';

import { theme } from './index';

export const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: theme.colors.text,
    background: theme.colors.background,
    card: theme.colors.background,
    text: theme.colors.text,
    border: '#383838',
    notification: theme.colors.buttonBackground,
  },
};
