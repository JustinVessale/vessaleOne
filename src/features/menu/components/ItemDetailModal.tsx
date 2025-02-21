import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useState } from 'react';

type MenuItemData = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
};

type ItemDetailModalProps = {
  item: MenuItemData;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: MenuItemData, quantity: number, instructions: string) => void;
};

export function ItemDetailModal({ item, isOpen, onClose, onAddToCart }: ItemDetailModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [instructions, setInstructions] = useState('');

  const handleAddToCart = () => {
    onAddToCart(item, quantity, instructions);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-white shadow-lg border rounded-lg">
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-48 object-cover rounded-lg"
          />
          
          <p className="text-gray-600">{item.description}</p>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Special Instructions</label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full min-h-[100px] p-2 border rounded-md"
              placeholder="Add any special instructions..."
            />
          </div>

          <div className="flex items-center justify-center">
            <div className="flex items-center border rounded-full px-2">
              <button 
                className="p-2"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
              >
                -
              </button>
              <span className="px-4">{quantity}</span>
              <button 
                className="p-2"
                onClick={() => setQuantity(q => q + 1)}
              >
                +
              </button>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6 sm:mt-8">
          <button
            className="w-full bg-blue-400 text-white py-4 px-6 rounded-lg 
                       hover:bg-blue-500 transition-colors font-medium text-lg
                       border-2 border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2
                       shadow-sm"
            onClick={handleAddToCart}
          >
            Add {quantity} to Cart • ${(item.price * quantity).toFixed(2)}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 