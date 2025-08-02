
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { User, CreateUserInput, UserRole } from '../../../server/src/schema';

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([
    {
      id: 1,
      username: 'manager',
      email: 'manager@store.com',
      password_hash: '',
      role: 'manager',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 2,
      username: 'cashier',
      email: 'cashier@store.com',
      password_hash: '',
      role: 'cashier',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const [formData, setFormData] = useState<CreateUserInput>({
    username: '',
    email: '',
    password: '',
    role: 'cashier'
  });

  // Reset form
  const resetForm = useCallback(() => {
    setFormData({
      username: '',
      email: '',
      password: '',
      role: 'cashier'
    });
  }, []);

  // Handle create user
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Demo user creation - replace with real API call when backend is implemented
      const newUser: User = {
        id: users.length + 1,
        username: formData.username,
        email: formData.email,
        password_hash: '', // Not shown on frontend
        role: formData.role,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      setUsers((prev: User[]) => [...prev, newUser]);
      resetForm();
      setShowAddDialog(false);
      
      // In real app, would call: await trpc.createUser.mutate(formData);
    } catch (error) {
      console.error('Failed to create user:', error);
      alert('Failed to create user. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [formData, users.length, resetForm]);

  // Toggle user status
  const toggleUserStatus = useCallback((userId: number) => {
    setUsers((prev: User[]) =>
      prev.map((user: User) =>
        user.id === userId
          ? { ...user, is_active: !user.is_active, updated_at: new Date() }
          : user
      )
    );
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">👥 User Management</h2>
          <p className="text-gray-600">Manage system users and permissions</p>
        </div>
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              ➕ Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>➕ Add New User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Alert>
                <AlertDescription>
                  <strong>Note:</strong> This is a demo interface. User creation uses local state for demonstration.
                </AlertDescription>
              </Alert>

              <div>
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateUserInput) => ({ ...prev, username: e.target.value }))
                  }
                  required
                  minLength={3}
                />
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateUserInput) => ({ ...prev, email: e.target.value }))
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateUserInput) => ({ ...prev, password: e.target.value }))
                  }
                  required
                  minLength={6}
                />
              </div>

              <div>
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={formData.role || 'cashier'}
                  onValueChange={(value: UserRole) =>
                    setFormData((prev: CreateUserInput) => ({ ...prev, role: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cashier">👤 Cashier</SelectItem>
                    <SelectItem value="manager">👑 Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? 'Creating...' : 'Create User'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Users List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((user: User) => (
          <Card key={user.id} className={`${!user.is_active ? 'opacity-60' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg flex items-center gap-2">
                  {user.role === 'manager' ? '👑' : '👤'} {user.username}
                </CardTitle>
                <Badge variant={user.is_active ? 'default' : 'secondary'}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Email:</span>
                  <span className="font-medium text-sm">{user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Role:</span>
                  <Badge variant="outline" className="text-xs">
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Created:</span>
                  <span className="text-sm">{user.created_at.toLocaleDateString()}</span>
                </div>
                {user.updated_at.getTime() !== user.created_at.getTime() && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Updated:</span>
                    <span className="text-sm">{user.updated_at.toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 space-y-2">
                <Button
                  size="sm"
                  variant={user.is_active ? "destructive" : "default"}
                  onClick={() => toggleUserStatus(user.id)}
                  className="w-full"
                >
                  {user.is_active ? '🚫 Deactivate' : '✅ Activate'}
                </Button>
              </div>

              {/* Role Permissions Info */}
              <div className="pt-2 text-xs text-gray-500">
                <p className="font-medium mb-1">Permissions:</p>
                <ul className="space-y-1">
                  <li>• Sales transactions</li>
                  <li>• Product viewing</li>
                  {user.role === 'cashier' && <li>• Basic stock management</li>}
                  {user.role === 'manager' && (
                    <>
                      <li>• Full product management</li>
                      <li>• Stock adjustments</li>
                      <li>• Financial reports</li>
                      <li>• User management</li>
                    </>
                  )}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {users.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center py-8">
            <p className="text-gray-500">No users found. Add your first user!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
