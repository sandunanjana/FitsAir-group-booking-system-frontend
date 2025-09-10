import { Outlet } from "react-router-dom";
import RootLayout from "@/components/RootLayout";

export default function App(): JSX.Element {
  return (
    <RootLayout>
      <Outlet />
    </RootLayout>
  );
}
