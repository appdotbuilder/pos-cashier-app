
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import type { User } from '../../server/src/schema';

// Import feature components
import { LoginForm } from '@/components/LoginForm';
import { SalesInterface } from '@/components/SalesInterface';
import { ProductManagement } from '@/components/ProductManagement';
import { StockManagement } from '@/components/StockManagement';
import { ReportsInterface } from '@/components/ReportsInterface';
import { UserManagement } from '@/components/UserManagement';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Authentication handler - using demo credentials since backend handlers are placeholder
  const handleLogin = useCallback(async (username: string) => {
    setIsLoading(true);
    try {
      // Demo authentication - replace with real authentication when backend is implemented
      const demoUser: User = {
        id: 1,
        username,
        email: `${username}@store.com`,
        password_hash: '', // Not needed on frontend
        role: username === 'manager' ? 'manager' : 'cashier',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };
      setCurrentUser(demoUser);
    } catch (error) {
      console.error('Login failed:', error);
      alert('Login failed. Use "cashier" or "manager" as username with any password.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
  }, []);

  // Show login form if not authenticated
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">🏪 CashFlow POS</h1>
            <p className="text-gray-600">Modern Point of Sale System</p>
          </div>
          <LoginForm onLogin={handleLogin} isLoading={isLoading} />
        </div>
      </div>
    );
  }

  const isCashier = currentUser.role === 'cashier';
  const isManager = currentUser.role === 'manager';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-bold text-gray-900">🏪 CashFlow POS</h1>
              <Badge variant="secondary" className="hidden sm:inline-flex">
                {currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 hidden sm:inline">
                Welcome, {currentUser.username}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs defaultValue="sales" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 mb-6">
            <TabsTrigger value="sales" className="text-xs sm:text-sm">
              🛒 Sales
            </TabsTrigger>
            <TabsTrigger value="products" className="text-xs sm:text-sm">
              📦 Products
            </TabsTrigger>
            {(isManager || isCashier) && (
              <TabsTrigger value="stock" className="text-xs sm:text-sm">
                📊 Stock
              </TabsTrigger>
            )}
            {isManager && (
              <>
                <TabsTrigger value="reports" className="text-xs sm:text-sm">
                  📈 Reports
                </TabsTrigger>
                <TabsTrigger value="users" className="text-xs sm:text-sm">
                  👥 Users
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Sales Interface - Available to all users */}
          <TabsContent value="sales">
            <SalesInterface currentUser={currentUser} />
          </TabsContent>

          {/* Product Management - Available to all users */}
          <TabsContent value="products">
            <ProductManagement currentUser={currentUser} />
          </TabsContent>

          {/* Stock Management - Available to cashiers and managers */}
          {(isManager || isCashier) && (
            <TabsContent value="stock">
              <StockManagement currentUser={currentUser} />
            </TabsContent>
          )}

          {/* Reports - Manager only */}
          {isManager && (
            <TabsContent value="reports">
              <ReportsInterface />
            </TabsContent>
          )}

          {/* User Management - Manager only */}
          {isManager && (
            <TabsContent value="users">
              <UserManagement />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}

export default App;
