import { formatCurrency } from "../../utils/formatCurrency.js";

const events = [
  {
    id: "tech-summit",
    title: "Tech Leaders Summit",
    city: "Bengaluru",
    date: "Aug 14",
    price: 2499,
    image:
      "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "founders-night",
    title: "Founders Night",
    city: "Mumbai",
    date: "Sep 02",
    price: 1499,
    image:
      "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "design-weekend",
    title: "Design Weekend",
    city: "Delhi",
    date: "Sep 21",
    price: 999,
    image:
      "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=900&q=80"
  }
];

export function EventHighlights() {
  return (
    <section id="events" className="mx-auto w-full max-w-6xl px-5 py-12">
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-mint">
            Featured events
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-normal text-ink">
            Upcoming experiences
          </h2>
        </div>
        <a className="text-sm font-semibold text-ember hover:text-ink" href="/">
          View all
        </a>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {events.map((event) => (
          <article
            className="overflow-hidden rounded-lg border border-ink/10 bg-white shadow-sm"
            key={event.id}
          >
            <img
              alt=""
              className="h-44 w-full object-cover"
              loading="lazy"
              src={event.image}
            />
            <div className="p-5">
              <div className="flex items-center justify-between gap-3 text-sm text-ink/60">
                <span>{event.city}</span>
                <span>{event.date}</span>
              </div>
              <h3 className="mt-3 text-xl font-bold tracking-normal text-ink">
                {event.title}
              </h3>
              <p className="mt-4 text-sm font-semibold text-mint">
                From {formatCurrency(event.price)}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
