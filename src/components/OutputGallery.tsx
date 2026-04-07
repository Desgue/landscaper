import { useInView } from '../hooks/useInView'
import japaneseImg from '../assets/landing/japanese.png'
import tropicalImg from '../assets/landing/tropical.png'
import kitchenImg from '../assets/landing/kitchen.png'

const galleryCards = [
  {
    style: 'Contemporary',
    season: 'Summer',
    time: 'Golden hour',
    image: '/images/gallery/contemporary-summer.png',
  },
{
    style: 'Japanese',
    season: 'Autumn',
    time: 'Afternoon',
    image: japaneseImg,
  },
  {
    style: 'Kitchen Garden',
    season: 'Spring',
    time: 'Morning',
    image: kitchenImg,
  },
  {
    style: 'Formal',
    season: 'Summer',
    time: 'Golden hour',
    image: '/images/gallery/formal-golden-hour.png',
  },
  {
    style: 'Mediterranean',
    season: 'Summer',
    time: 'Afternoon',
    image: '/images/gallery/mediterranean-sunset.png',
  },
  {
    style: 'Tropical',
    season: 'Summer',
    time: 'Midday',
    image: tropicalImg,
  },
]

const staggerDelays = [
  '',
  'animate-delay-100',
  'animate-delay-200',
  'animate-delay-300',
  'animate-delay-400',
  'animate-delay-400',
]

export default function OutputGallery() {
  const { ref, isInView } = useInView({ threshold: 0.1, rootMargin: '0px 0px -40px 0px' })

  return (
    <section
      id="gallery"
      ref={ref}
      className="bg-bg py-16 px-6 border-t border-border"
      aria-labelledby="gallery-heading"
    >
      <div className="max-w-6xl mx-auto text-center">
        <h2
          id="gallery-heading"
          className={`text-3xl sm:text-4xl font-bold text-text mb-3 animate-on-scroll ${isInView ? 'animate-fade-up' : ''}`}
        >
          See What Greenprint Can Create
        </h2>
        <p
          className={`text-text-secondary text-lg mb-10 max-w-2xl mx-auto animate-on-scroll animate-delay-100 ${isInView ? 'animate-fade-up' : ''}`}
        >
          Every layout becomes a realistic landscape image. Pick a style,
          season, and time of day.
        </p>

        <div
          role="list"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {galleryCards.map((card, i) => (
            <div
              key={card.style}
              role="listitem"
              className={`rounded-xl shadow-md overflow-hidden bg-bg-card animate-on-scroll ${staggerDelays[i]} ${isInView ? 'animate-fade-up' : ''}`}
            >
              <img
                src={card.image}
                alt={`AI-generated ${card.style.toLowerCase()} landscape in ${card.season.toLowerCase()}`}
                className="h-48 w-full object-cover"
                width={1376}
                height={768}
                loading={i < 3 ? undefined : 'lazy'}
              />
              <div className="p-4 text-left">
                <p className="font-bold text-text">{card.style}</p>
                <p className="text-sm text-text-muted">
                  {card.season} &middot; {card.time}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
