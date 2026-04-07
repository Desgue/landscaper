import { useInView } from '../hooks/useInView'

const galleryCards = [
  {
    style: 'Contemporary',
    season: 'Summer',
    time: 'Golden hour',
    gradient: 'linear-gradient(135deg, #2D6A4F 0%, #40916C 40%, #E8A838 100%)',
  },
  {
    style: 'Cottage',
    season: 'Spring',
    time: 'Morning',
    gradient: 'linear-gradient(135deg, #F2C6D0 0%, #A7C4A0 50%, #EDF2E8 100%)',
  },
  {
    style: 'Japanese',
    season: 'Autumn',
    time: 'Afternoon',
    gradient: 'linear-gradient(135deg, #D4763C 0%, #C45B28 40%, #2D6A4F 100%)',
  },
  {
    style: 'Tropical',
    season: 'Summer',
    time: 'Midday',
    gradient: 'linear-gradient(135deg, #40916C 0%, #2D6A4F 40%, #5BC0BE 100%)',
  },
  {
    style: 'Formal',
    season: 'Winter',
    time: 'Overcast',
    gradient: 'linear-gradient(135deg, #8A8D84 0%, #A8B5A0 40%, #C4CCC0 100%)',
  },
  {
    style: 'Mediterranean',
    season: 'Summer',
    time: 'Sunset',
    gradient: 'linear-gradient(135deg, #C67B4E 0%, #D4923C 40%, #5C8A50 100%)',
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
  const { ref, isInView } = useInView({ threshold: 0.1 })

  return (
    <section
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
              <div
                className="h-48"
                style={{ background: card.gradient }}
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
