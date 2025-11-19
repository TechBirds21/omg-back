import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus,
  Minus,
  X,
  Percent,
  DollarSign,
  ShoppingCart,
  CreditCard,
  Receipt,
  Trash2,
  Tag
} from 'lucide-react';

interface BillItem {
  product_id: string;
  product_name: string;
  product_sku?: string;
  quantity: number;
  unit_price: number;
  color?: string;
  size?: string;
  discount_amount: number;
  discount_percentage: number;
  line_total: number;
  product_image?: string;
}

interface BillingCartProps {
  items: BillItem[];
  onUpdateQuantity: (index: number, quantity: number) => void;
  onRemoveItem: (index: number) => void;
  onClearCart: () => void;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  finalAmount: number;
  discountType: 'percent' | 'amount';
  setDiscountType: (type: 'percent' | 'amount') => void;
  discountInput: string;
  setDiscountInput: (value: string) => void;
  taxPercentage: number;
  setTaxPercentage: (value: number) => void;
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;
  onCheckout: () => void;
  isProcessing?: boolean;
}

const BillingCart = ({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  subtotal,
  discountAmount,
  taxAmount,
  finalAmount,
  discountType,
  setDiscountType,
  discountInput,
  setDiscountInput,
  taxPercentage,
  setTaxPercentage,
  paymentMethod,
  setPaymentMethod,
  onCheckout,
  isProcessing = false
}: BillingCartProps) => {
  return (
    <div className="h-full flex flex-col bg-stone-50">
      {/* Cart Header */}
      <div className="p-4 bg-white border-b border-stone-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-stone-600" />
            <h2 className="text-lg font-light text-stone-900">Cart</h2>
            <span className="text-sm text-stone-500">({items.length})</span>
          </div>
          {items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearCart}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-12">
            <ShoppingCart className="w-16 h-16 text-stone-300 mb-4" />
            <p className="text-stone-500 font-light">Cart is empty</p>
            <p className="text-sm text-stone-400 mt-1">Add products to start billing</p>
          </div>
        ) : (
          items.map((item, index) => (
            <Card key={index} className="p-3 bg-white border-stone-200">
              <div className="flex gap-3">
                {/* Product Image */}
                {item.product_image && (
                  <div className="w-16 h-16 flex-shrink-0 bg-stone-100 rounded overflow-hidden">
                    <img
                      src={item.product_image}
                      alt={item.product_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Product Details */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-stone-900 truncate">
                    {item.product_name}
                  </h3>
                  {item.product_sku && (
                    <p className="text-xs text-stone-500">SKU: {item.product_sku}</p>
                  )}
                  {(item.color || item.size) && (
                    <div className="flex gap-2 mt-1">
                      {item.color && (
                        <span className="text-xs bg-stone-100 px-2 py-0.5 rounded">
                          {item.color}
                        </span>
                      )}
                      {item.size && (
                        <span className="text-xs bg-stone-100 px-2 py-0.5 rounded">
                          {item.size}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Price & Quantity Controls */}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onUpdateQuantity(index, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="h-7 w-7 p-0"
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="text-sm font-medium min-w-[2rem] text-center">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                        className="h-7 w-7 p-0"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-medium text-stone-900">
                        ₹{item.line_total.toFixed(2)}
                      </p>
                      <p className="text-xs text-stone-500">
                        ₹{item.unit_price.toFixed(2)} each
                      </p>
                    </div>
                  </div>
                </div>

                {/* Remove Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveItem(index)}
                  className="h-7 w-7 p-0 text-stone-400 hover:text-red-600"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Cart Footer - Summary & Checkout */}
      {items.length > 0 && (
        <div className="border-t border-stone-200 bg-white p-4 space-y-4">
          {/* Discount */}
          <div className="space-y-2">
            <Label className="text-xs text-stone-600 font-light">Discount</Label>
            <div className="flex gap-2">
              <Select value={discountType} onValueChange={(v: any) => setDiscountType(v)}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">
                    <Percent className="w-4 h-4 inline mr-1" />%
                  </SelectItem>
                  <SelectItem value="amount">
                    <DollarSign className="w-4 h-4 inline mr-1" />₹
                  </SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="0"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

          {/* Tax */}
          <div className="space-y-2">
            <Label className="text-xs text-stone-600 font-light">Tax %</Label>
            <Input
              type="number"
              placeholder="0"
              value={taxPercentage || ''}
              onChange={(e) => setTaxPercentage(parseFloat(e.target.value) || 0)}
            />
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label className="text-xs text-stone-600 font-light">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="online">Online Payment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Summary */}
          <div className="space-y-2 pt-4 border-t border-stone-200">
            <div className="flex justify-between text-sm">
              <span className="text-stone-600">Subtotal</span>
              <span className="font-medium">₹{subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount</span>
                <span>-₹{discountAmount.toFixed(2)}</span>
              </div>
            )}
            {taxAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-stone-600">Tax ({taxPercentage}%)</span>
                <span className="font-medium">₹{taxAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-medium pt-2 border-t border-stone-200">
              <span>Total</span>
              <span className="text-stone-900">₹{finalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Checkout Button */}
          <Button
            onClick={onCheckout}
            disabled={isProcessing}
            className="w-full bg-stone-900 hover:bg-stone-800 text-white py-6"
          >
            <Receipt className="w-4 h-4 mr-2" />
            {isProcessing ? 'Processing...' : 'Proceed to Checkout'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default BillingCart;
