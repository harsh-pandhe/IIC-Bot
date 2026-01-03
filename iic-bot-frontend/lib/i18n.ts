// lib/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
    en: {
        translation: {
            // Common
            welcome: "Welcome to IIC Bot",
            loading: "Loading...",
            error: "Error",
            success: "Success",

            // Auth
            login: "Login",
            logout: "Logout",
            username: "Username",
            password: "Password",
            invalidCredentials: "Invalid credentials",

            // Chat
            askQuestion: "Ask a question...",
            send: "Send",
            listening: "Listening...",
            speak: "Speak",
            copy: "Copy",
            copied: "Copied!",
            rating: "Rate this answer",
            sources: "Sources",
            followUpQuestions: "Follow-up Questions",

            // Commands
            learnCommand: "Type /learn [info] to teach the bot",
            unlearnCommand: "Type /unlearn [search] to remove learned content",

            // Suggestions
            suggestedQuestions: "Suggested Questions",

            // Empty states
            noMessages: "No messages yet",
            startConversation: "Start a conversation by asking a question",

            // Shortcuts
            shortcuts: "Keyboard Shortcuts",
            focusInput: "Focus input",
            clearChat: "Clear chat",
            toggleTheme: "Toggle theme",

            // Settings
            settings: "Settings",
            theme: "Theme",
            language: "Language",
            darkMode: "Dark Mode",
            lightMode: "Light Mode",
            systemMode: "System",
        }
    },
    hi: {
        translation: {
            welcome: "IIC बॉट में आपका स्वागत है",
            loading: "लोड हो रहा है...",
            error: "त्रुटि",
            success: "सफलता",

            login: "लॉग इन करें",
            logout: "लॉग आउट",
            username: "उपयोगकर्ता नाम",
            password: "पासवर्ड",
            invalidCredentials: "अमान्य क्रेडेंशियल",

            askQuestion: "एक सवाल पूछें...",
            send: "भेजें",
            listening: "सुन रहा है...",
            speak: "बोलें",
            copy: "कॉपी",
            copied: "कॉपी किया गया!",
            rating: "इस उत्तर को रेट करें",
            sources: "स्रोत",
            followUpQuestions: "अनुवर्ती प्रश्न",

            suggestedQuestions: "सुझाए गए प्रश्न",
            noMessages: "अभी तक कोई संदेश नहीं",
            startConversation: "एक सवाल पूछकर बातचीत शुरू करें",

            settings: "सेटिंग्स",
            theme: "थीम",
            language: "भाषा",
            darkMode: "डार्क मोड",
            lightMode: "लाइट मोड",
            systemMode: "सिस्टम",
        }
    },
    es: {
        translation: {
            welcome: "Bienvenido a IIC Bot",
            loading: "Cargando...",
            error: "Error",
            success: "Éxito",

            login: "Iniciar sesión",
            logout: "Cerrar sesión",
            username: "Nombre de usuario",
            password: "Contraseña",
            invalidCredentials: "Credenciales inválidas",

            askQuestion: "Haz una pregunta...",
            send: "Enviar",
            listening: "Escuchando...",
            speak: "Hablar",
            copy: "Copiar",
            copied: "¡Copiado!",
            rating: "Califica esta respuesta",
            sources: "Fuentes",
            followUpQuestions: "Preguntas de seguimiento",

            suggestedQuestions: "Preguntas sugeridas",
            noMessages: "Sin mensajes aún",
            startConversation: "Inicia una conversación haciendo una pregunta",

            settings: "Configuración",
            theme: "Tema",
            language: "Idioma",
            darkMode: "Modo oscuro",
            lightMode: "Modo claro",
            systemMode: "Sistema",
        }
    }
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: 'en',
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;
