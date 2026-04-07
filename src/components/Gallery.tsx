import cottageImg from '../assets/landing/cottage.png'
import japaneseImg from '../assets/landing/japanese.png'
import kitchenImg from '../assets/landing/kitchen.png'
import mediterraneanImg from '../assets/landing/mediterranean.png'
import tropicalImg from '../assets/landing/tropical.png'
import formalImg from '../assets/landing/formal.png'

const images = [
  { src: cottageImg, label: 'Cottage', style: 'Golden hour' },
  { src: japaneseImg, label: 'Japanese', style: 'Autumn overcast' },
  { src: kitchenImg, label: 'Kitchen', style: 'Morning light' },
  { src: mediterraneanImg, label: 'Mediterranean', style: 'Midday sun' },
  { src: tropicalImg, label: 'Tropical', style: 'Golden hour' },
  { src: formalImg, label: 'Formal', style: 'Spring morning' },
]

export default function Gallery() {
  return (
    <section className="bg-white py-24 px-6 border-t border-gray-100">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-3">
            See what Greenprint can create
          </h2>
          <p className="text-gray-500 text-base max-w-xl mx-auto">
            Every image below was generated from a plan layout — no manual
            editing, no Photoshop.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map((img) => (
            <div
              key={img.label}
              className="group relative rounded-xl overflow-hidden border border-gray-200"
            >
              <img
                src={img.src}
                alt={`${img.label} garden preview`}
                className="w-full h-56 object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                <p className="text-white font-semibold text-sm">
                  {img.label}
                </p>
                <p className="text-white/70 text-xs">{img.style}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
