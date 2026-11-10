import { createTheme, type MantineColorsTuple } from '@mantine/core';

// Hồng phấn làm màu chính, xanh mint làm màu phụ: tươi sáng nhưng vẫn dịu mắt khi làm việc lâu.
const blossom: MantineColorsTuple = [
  '#fff0f6',
  '#ffdeeb',
  '#fcc2d7',
  '#faa2c1',
  '#f783ac',
  '#f06595',
  '#e64980',
  '#d6336c',
  '#c2255c',
  '#a61e4d',
];

const mint: MantineColorsTuple = [
  '#e6fcf5',
  '#c3fae8',
  '#96f2d7',
  '#63e6be',
  '#38d9a9',
  '#20c997',
  '#12b886',
  '#0ca678',
  '#099268',
  '#087f5b',
];

export const theme = createTheme({
  primaryColor: 'pink',
  primaryShade: 6,
  colors: { pink: blossom, mint },
  fontFamily: '"Be Vietnam Pro", system-ui, -apple-system, "Segoe UI", sans-serif',
  headings: { fontFamily: '"Be Vietnam Pro", system-ui, sans-serif', fontWeight: '700' },
  defaultRadius: 'md',
  cursorType: 'pointer',
  components: {
    Button: { defaultProps: { radius: 'md' } },
    Card: { defaultProps: { radius: 'lg', withBorder: true, shadow: 'xs' } },
    Paper: { defaultProps: { radius: 'lg' } },
    TextInput: { defaultProps: { radius: 'md' } },
    Modal: { defaultProps: { radius: 'lg', centered: true, overlayProps: { blur: 2 } } },
    Drawer: { defaultProps: { overlayProps: { blur: 2 } } },
    Table: { defaultProps: { verticalSpacing: 'sm', highlightOnHover: true } },
  },
});
