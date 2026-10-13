import { FaBullseye, FaCog, FaHeart, FaListUl, FaRobot, FaWallet } from 'react-icons/fa';
import { FiHome } from "react-icons/fi";
import { GiShoppingCart } from "react-icons/gi";
import { RxHamburgerMenu } from "react-icons/rx";
import { useLocation, useNavigate } from "react-router-dom";
import { ModeToggle } from "./mode-toggle";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { IoCarSportOutline } from "react-icons/io5";
import { useSettingsStore } from "@/stores/settings";

interface HeaderProps {
  title: string;
  isShort?: boolean;
}

function Header({ title = "", isShort }: HeaderProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isTitheMenuEnabled = useSettingsStore((s) => s.isTitheMenuEnabled);

  const isActive = (path: string) =>
    path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`);

  const activeDropdownClass =
    "bg-purple-100 text-purple-900 font-semibold dark:bg-purple-950 dark:text-purple-100 [&_svg]:text-purple-700 dark:[&_svg]:text-purple-300";

  const primaryNav = [
    { to: "/", label: "Início", Icon: FiHome },
    { to: "/financas", label: "Finanças", Icon: FaWallet },
    { to: "/goals", label: "Metas", Icon: FaBullseye },
  ];

  return (
    <div data-isshort={isShort} className="w-full min-h-48 data-[isshort=true]:min-h-24 flex flex-col bg-purple-600 p-8 items-center">
      <header className="w-full px-2 flex flex-row justify-between items-center max-w-[800px]">
        <h2 className="font-bold text-white text-2xl flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/")}
            aria-label="Voltar para o início"
            title="Voltar para o início"
            className="rounded-lg cursor-pointer hover:opacity-80 focus-visible:outline-2 focus-visible:outline-white"
          >
            <img src="/icon.png" alt="Ícone Finanças" className="h-8 w-8 rounded-lg" />
          </button>
          {title}<span className="text-purple-900">$</span>
        </h2>

        <div className="flex flex-row gap-2 items-center">
          <nav aria-label="Navegação principal" className="hidden md:flex items-center gap-2">
            {primaryNav.map(({ to, label, Icon }) => {
              const active = isActive(to);
              return (
                <Button
                  key={to}
                  variant="outline"
                  size="sm"
                  aria-current={active ? "page" : undefined}
                  onClick={() => navigate(to)}
                  className={cn(
                    "gap-2 border-white",
                    active
                      ? "bg-white text-purple-700 hover:bg-white hover:text-purple-700 font-semibold"
                      : "text-white bg-purple-600 hover:bg-purple-700 hover:text-white hover:border-purple-200"
                  )}
                >
                  <Icon aria-hidden />
                  {label}
                </Button>
              );
            })}
          </nav>
          <ModeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                data-testid="main-menu-trigger"
                className="border-white text-white bg-purple-600 hover:bg-purple-600 hover:border-purple-300 hover:text-purple-300"
                variant="outline"
              >
                <RxHamburgerMenu />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Finança$</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => navigate("/")}
                  className={cn("md:hidden", isActive("/") && activeDropdownClass)}
                >
                  Início
                  <DropdownMenuShortcut>
                    <FiHome />
                  </DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate("/financas")}
                  className={cn("md:hidden", isActive("/financas") && activeDropdownClass)}
                >
                  Finanças
                  <DropdownMenuShortcut>
                    <FaWallet />
                  </DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate("/stock")}
                  className={cn(isActive("/stock") && activeDropdownClass)}
                >
                  Estoque
                  <DropdownMenuShortcut>
                    <GiShoppingCart />
                  </DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate("/runs")}
                  className={cn(isActive("/runs") && activeDropdownClass)}
                >
                  Corridas
                  <DropdownMenuShortcut>
                    <IoCarSportOutline />
                  </DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate("/goals")}
                  className={cn("md:hidden", isActive("/goals") && activeDropdownClass)}
                >
                  Metas
                  <DropdownMenuShortcut>
                    <FaBullseye />
                  </DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate("/lists")}
                  className={cn(isActive("/lists") && activeDropdownClass)}
                >
                  Listas
                  <DropdownMenuShortcut>
                    <FaListUl />
                  </DropdownMenuShortcut>
                </DropdownMenuItem>
                {isTitheMenuEnabled === 1 ? (
                  <DropdownMenuItem
                    data-testid="menu-item-tithe"
                    onClick={() => navigate("/tithe")}
                    className={cn(isActive("/tithe") && activeDropdownClass)}
                  >
                    Dízimo
                    <DropdownMenuShortcut>
                      <FaHeart />
                    </DropdownMenuShortcut>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                  onClick={() => navigate("/ia")}
                  className={cn(isActive("/ia") && activeDropdownClass)}
                >
                  IA
                  <DropdownMenuShortcut>
                    <FaRobot />
                  </DropdownMenuShortcut>
                </DropdownMenuItem>
                {/* <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/investiments")}>
                  Simule investimentos
                  <DropdownMenuShortcut>
                    <LuLineChart />
                  </DropdownMenuShortcut>
                </DropdownMenuItem> */}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => navigate("/settings")}
                  className={cn(isActive("/settings") && activeDropdownClass)}
                >
                  Configurações
                  <DropdownMenuShortcut>
                    <FaCog />
                  </DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

    </div>
  );
}
export default Header;
