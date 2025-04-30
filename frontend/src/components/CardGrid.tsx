import PokemonCard from './PokemonCard';

type CardData = {
  id: number;
  tokenId: number;
  name: string;
  imageUrl: string;
  type: string;
  rarity: string;
  price?: string;
  isListed?: boolean;
  listingId?: number;
  isAuction?: boolean;
};

type CardGridProps = {
  cards: CardData[];
};

export default function CardGrid({ cards }: CardGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {cards.map((card) => (
        <PokemonCard
          key={card.tokenId}
          id={card.id}
          tokenId={card.tokenId}
          name={card.name}
          imageUrl={card.imageUrl}
          type={card.type}
          rarity={card.rarity}
          price={card.price}
          isListed={card.isListed}
        />
      ))}
    </div>
  );
}
