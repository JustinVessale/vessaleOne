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
    <div className="group flex items-start gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer" onClick={handleAddToCart}>
      <div className="flex-1 min-w-0">
        <h3 className="text-lg font-medium text-gray-900 truncate">{item.name}</h3>
        <p className="mt-1 text-sm text-gray-500 line-clamp-2">{item.description}</p>
        <p className="mt-2 text-base font-medium text-gray-900">${item.price.toFixed(2)}</p>
      </div>
      
      {item.imageUrl && (
        <div className="flex-shrink-0 w-20 h-20 relative rounded-lg overflow-hidden">
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
        </div>
      )}
    </div>
  );
}