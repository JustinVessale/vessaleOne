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
  restaurantId: string;
};

export function MenuItem({ item, restaurantId }: MenuItemProps) {
  const { addItem } = useCart();

  const handleAddToCart = () => {
    addItem({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      imageUrl: item.imageUrl,
      restaurantId
    });
  };

  return (
    <div className="flex flex-col bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Image Container - Now on top */}
      {item.imageUrl && (
        <div className="w-full h-48 relative">
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      
      {/* Content Container - Below image */}
      <div className="p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-1">{item.name}</h3>
        <p className="text-sm text-gray-500 mb-2 line-clamp-2">{item.description}</p>
        <div className="flex items-center justify-between">
          <p className="text-base font-medium text-gray-900">${item.price.toFixed(2)}</p>
          <button 
            onClick={handleAddToCart}
            className="text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}