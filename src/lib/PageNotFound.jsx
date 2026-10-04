import { useLocation } from 'react-router-dom';
import { api } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/button';


export default function PageNotFound({}) {
    const location = useLocation();
    const pageName = location.pathname.substring(1);

    const { data: authData, isFetched } = useQuery({
        queryKey: ['user'],
        queryFn: async () => {
            try {
                const user = await api.auth.me();
                return { user, isAuthenticated: true };
            } catch (error) {
                return { user: null, isAuthenticated: false };
            }
        }
    });
    
    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
            <div className="max-w-md w-full">
                <div className="text-center space-y-6">
                    {/* 404 Error Code */}
                    <div className="space-y-2">
                        <h1 className="text-7xl font-light text-muted-foreground/40">404</h1>
                        <div className="h-0.5 w-16 bg-border mx-auto"></div>
                    </div>
                    
                    {/* Main Message */}
                    <div className="space-y-3">
                        <h2 className="text-2xl font-medium text-foreground">
                            העמוד לא נמצא
                        </h2>
                        <p className="text-muted-foreground leading-relaxed">
                            העמוד <span className="font-medium text-foreground">"{pageName}"</span> לא נמצא במערכת.
                        </p>
                    </div>
                    
                    {/* Admin Note */}
                    {isFetched && authData.isAuthenticated && authData.user?.role === 'admin' && (
                        <div className="mt-8 p-4 bg-accent rounded-lg border border-border">
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-warning-muted flex items-center justify-center mt-0.5">
                                    <div className="w-2 h-2 rounded-full bg-warning"></div>
                                </div>
                                <div className="text-right space-y-1">
                                    <p className="text-sm font-medium text-foreground">הערת מנהל</p>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        ייתכן שהעמוד עדיין לא מומש. בקש מה-AI לממש אותו בצ'אט.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Action Button */}
                    <div className="pt-6">
                        <Button variant="outline" onClick={() => window.location.href = '/'}>
                            <Home className="w-4 h-4" />
                            חזרה לדף הבית
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}