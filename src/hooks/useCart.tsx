import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

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
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const findProduct = cart.find((product) => product.id === productId);

      //
      if (!findProduct) {
        const { data } = await api.get(`/products/${productId}`);
        const qtdaStock = await api.get(`/stock/${data.id}`);
        //
        const productWithAmount = {
          ...data,
          amount: 1,
        };
        //
        if (productWithAmount.amount <= qtdaStock.data.amount) {
          setCart([...cart, productWithAmount]);

          localStorage.setItem(
            "@RocketShoes:cart",
            JSON.stringify([...cart, productWithAmount])
          );
        } else {
          toast.error("Quantidade solicitada fora de estoque");
          return;
        }
        //
      } else {
        const qtdaStock = await api.get(`/stock/${productId}`);
        //
        if (findProduct.amount < qtdaStock.data.amount) {
          const updateProducts = cart.map((product) => {
            if (product.id === findProduct.id) {
              return {
                ...product,
                amount: product.amount + 1,
              };
            }
            return product;
          });
          localStorage.setItem(
            "@RocketShoes:cart",
            JSON.stringify(updateProducts)
          );
          setCart([...updateProducts]);
        } else {
          toast.error("Quantidade solicitada fora de estoque");
          return;
        }
      }
    } catch {
      // TODO
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const findProduct = cart.find((product) => product.id === productId);
      if (findProduct) {
        const productsFiltered = cart.filter(
          (product) => product.id !== productId
        );
        setCart(productsFiltered);
        localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify(productsFiltered)
        );
        return;
      }
      throw new Error("Erro na remoção do produto");
    } catch {
      // TODO
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }
      const qtdaStock = await api.get(`/stock/${productId}`);
      //
      if (amount > qtdaStock.data.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }
      //
      const findProduct = cart.find((product) => product.id === productId);
      //
      if (findProduct) {
        const updateProducts = cart.map((product) => {
          if (product.id === findProduct.id) {
            return {
              ...product,
              amount,
            };
          }
          return product;
        });
        localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify(updateProducts)
        );
        setCart([...updateProducts]);
        return;
      } else {
        throw new Error("Produto não encontrado");
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
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