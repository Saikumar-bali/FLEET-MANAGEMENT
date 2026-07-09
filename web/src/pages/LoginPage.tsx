import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Truck, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";

export function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(identifier, password);
      navigate("/");
    } catch {
      toast.error("Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Truck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">FleetOS</h1>
          <p className="text-gray-500 mt-2">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username or Email</label>
            <input type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="admin" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pr-10" placeholder="••••••••" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Demo credentials:</p>
          <div className="mt-2 space-y-1 font-mono text-xs">
            <p>admin / admin@123</p>
            <p>driver / driver@123</p>
            <p>mechanic / mechanic@123</p>
            <p>finance / finance@123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
