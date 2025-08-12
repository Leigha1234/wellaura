// in app/context/FavoritesContext.tsx

import React, { createContext, useContext, useState } from 'react';

interface FavoritesContextType {
    favorites: Set<string>;
    toggleFavorite: (mealId: string) => void;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider = ({ children }: { children: React.ReactNode }) => {
    const [favorites, setFavorites] = useState(new Set<string>());

    const toggleFavorite = (mealId: string) => {
        setFavorites(prev => {
            const newFavs = new Set(prev);
            if (newFavs.has(mealId)) {
                newFavs.delete(mealId);
            } else {
                newFavs.add(mealId);
            }
            return newFavs;
        });
    };

    return (
        <FavoritesContext.Provider value={{ favorites, toggleFavorite }}>
            {children}
        </FavoritesContext.Provider>
    );
};

export const useFavorites = () => {
    const context = useContext(FavoritesContext);
    if (context === undefined) {
        throw new Error('useFavorites must be used within a FavoritesProvider');
    }
    return context;
};