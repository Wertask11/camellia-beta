/// <reference types="vite/client" />
interface ImportMetaEnv { readonly VITE_POSTHOG_KEY?:string; readonly VITE_POSTHOG_HOST?:string; readonly VITE_TODAY_ONE_FLOW?:string; readonly VITE_ADAPTIVE_STAGE_UI?:string }
interface ImportMeta { readonly env:ImportMetaEnv }
