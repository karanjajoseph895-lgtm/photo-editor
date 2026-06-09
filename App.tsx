import { Routes, Route } from "react-router";
import EditorPage from "./pages/EditorPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<EditorPage />} />
    </Routes>
  );
}
