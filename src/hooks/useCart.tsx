import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  useEffect(() => {
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
  }, [cart])

  const addProduct = async (productId: number) => {
    try {
      const product = cart.find(product => product.id === productId)

      const amount = product ? product.amount : 0;

      updateProductAmount({
        productId: productId,
        amount: amount + 1
      })
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const products = cart.filter(product => product.id !== productId)

      setCart(products)
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0) {
        return;
      }

      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

      if(amount > stock.amount) {
        toast.error('Quantidade solicitada fora de estoque');

        return;
      }

      const isAlreadyAddProduct = cart.find(product => product.id === productId)

      if(!isAlreadyAddProduct) {
        const response = await api.get<Product>(`/products/${productId}`);

        response.data.amount = 1; 

        setCart([...cart, response.data])
      } else {
        const products = cart.map(product => {
          if(product.id === productId) {
            product.amount = amount;
          }
  
          return product;
        })
  
        setCart(products)
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
