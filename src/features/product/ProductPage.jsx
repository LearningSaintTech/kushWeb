import { useParams } from 'react-router-dom'

function ProductPage() {
  const { id } = useParams()
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Product</h1>
      <p className="mt-2 text-gray-600">Product detail for ID: {id}. Gallery, add to cart go here.</p>
    </div>
  )
}

export default ProductPage
