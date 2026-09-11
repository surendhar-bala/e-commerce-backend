export type UserRole = 'admin' | 'seller' | 'customer'

export type UserRow = {
  id: string
  name: string
  email: string
  phone: string | null
  password_hash: string
  role: UserRole
  status: string
  created_at: Date
  updated_at: Date
}

export type ProductStatus = 'active' | 'draft' | 'archived'

export type ProductRow = {
  id: string
  slug: string
  name: string
  description: string
  category_id: string
  price: string
  compare_at_price: string | null
  stock: number
  status: ProductStatus
  rating: string
  review_count: number
  featured: boolean
  trending: boolean
  seller_id: string | null
  sku: string | null
  created_by: string | null
  created_at: Date
  updated_at: Date
}

export type ProductMediaRow = {
  id: string
  product_id: string
  seller_id: string | null
  media_type: 'IMAGE' | 'VIDEO'
  file_name: string | null
  r2_key: string | null
  url: string
  alt: string | null
  sort_order: number
  created_at: Date
}

export type ProductSpecificationRow = {
  id: string
  product_id: string
  label: string
  value: string
  sort_order: number
}

export type OrderRow = {
  id: string
  buyer_id: string | null
  total_amount: string
  subtotal: string
  shipping: string
  status: string
  razorpay_order_id: string | null
  customer_email: string | null
  customer_phone: string | null
  shipping_full_name: string
  shipping_line1: string
  shipping_line2: string | null
  shipping_city: string
  shipping_state: string
  shipping_postal_code: string
  shipping_country: string
  created_at: Date
  updated_at: Date
}

export type OrderItemRow = {
  id: string
  order_id: string
  product_id: string
  seller_id: string | null
  name: string
  image_url: string | null
  quantity: number
  unit_price: string
  total_price: string
}
