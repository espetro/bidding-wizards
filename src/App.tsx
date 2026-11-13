import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { Estimator } from "./features/bid-sheet";
import { Landing } from "./features/landing";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/bid" element={<Estimator />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
