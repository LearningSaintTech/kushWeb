import Banner from './Banner'

function HomePage() {
  return (
    <div>
      <Banner />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900">Home</h1>
        <p className="mt-2 text-gray-600">Featured products and banners go here.</p>
      </div>
    </div>
  )
}

export default HomePage
