import { Header } from "@/components/layout/Header";
import { KeysList } from "@/components/keys/KeysList";

export default function KeysPage() {
  return (
    <div>
      <Header />
      <div className="p-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <KeysList />
        </div>
      </div>
    </div>
  );
}
