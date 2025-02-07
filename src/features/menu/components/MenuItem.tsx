import { PlusIcon } from '@heroicons/react/24/solid';
import { useCart } from '../../cart/context/CartContext';

type MenuItemData = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
};

type MenuItemProps = {
  item: MenuItemData;
};

export function MenuItem({ item }: MenuItemProps) {
  const { addItem } = useCart();

  const handleAddToCart = () => {
    addItem({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      imageUrl: item.imageUrl,
    });
  };

  return (
    <div className="flex items-start gap-4 p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
      {item.imageUrl && (
        <img
          src={item.imageUrl}
          alt={item.name}
          className="w-24 h-24 object-cover rounded-lg"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{item.name}</h3>
            <p className="mt-1 text-gray-500">{item.description}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-lg font-medium text-gray-900">
              ${item.price.toFixed(2)}
            </span>
            <button
              className="inline-flex items-center justify-center p-2 text-white bg-primary-400 rounded-full hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-400"
              onClick={handleAddToCart}
            >
              <PlusIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 