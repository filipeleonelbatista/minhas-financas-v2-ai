import { useNavigate } from "react-router-dom";
import Header from "../components/header";
import Footer from "../components/footer";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-gray-100 dark:bg-gray-900">
      <Header title="404" isShort />
      <div className="my-2 flex w-full max-w-[800px] flex-col items-center gap-4 px-2">
        <p className="text-4xl font-bold">404</p>
        <p className="text-gray-500">Página não encontrada.</p>
        <Button onClick={() => navigate("/")}>Voltar ao início</Button>
      </div>
      <Footer />
    </div>
  );
}
