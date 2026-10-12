import { createContext, useContext } from 'react';
import { MESSAGES, type Lang, type Messages } from './messages';

export const I18nContext = createContext<{ lang: Lang; t: Messages }>({ lang: 'pt-BR', t: MESSAGES['pt-BR'] });

/** The current language and its messages. */
export const useI18n = () => useContext(I18nContext);
