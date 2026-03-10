import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AppLanguageProvider } from "@/lib/i18n";

createRoot(document.getElementById("root")!).render(
	<AppLanguageProvider>
		<App />
	</AppLanguageProvider>
);
