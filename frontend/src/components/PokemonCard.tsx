import Image from 'next/image';
import Link from 'next/link';

type PokemonCardProps = {
  id: number;
  tokenId: number;
  name: string;
  imageUrl: string;
  type: string;
  rarity: string;
  price?: string;
  isListed?: boolean;
};

export default function PokemonCard({
  id,
  tokenId,
  name,
  imageUrl,
  type,
  rarity,
  price,
  isListed
}: PokemonCardProps) {
  // Map rarity to color
  const rarityColors = {
    'Common': 'bg-gray-200',
    'Uncommon': 'bg-green-200',
    'Rare': 'bg-blue-200',
    'Ultra Rare': 'bg-purple-200',
    'Legendary': 'bg-yellow-200'
  };
  
  const rarityColor = rarityColors[rarity as keyof typeof rarityColors] || 'bg-gray-200';
  
  return (
    <Link href={`/card/${tokenId}`}>
      <div className="bg-white rounded-lg shadow-md overflow-hidden transition-transform hover:scale-105">
        <div className="relative h-48 w-full">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={name}
              fill
              className="object-contain"
            />
          ) : (
            <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
              <p className="text-gray-500">No Image</p>
            </div>
          )}
        </div>
        
        <div className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-lg">{name}</h3>
            <span className={`text-xs px-2 py-1 rounded ${rarityColor}`}>
              {rarity}
            </span>
          </div>
          
          <p className="text-sm text-gray-600 mb-3">Type: {type}</p>
          
          {isListed && price && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <p className="text-blue-600 font-medium">{price} ETH</p>
            </div>
          )}
          
          {isListed && (
            <div className="mt-2 bg-blue-600 text-white text-center py-1 rounded-md text-sm">
              Listed for Sale
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
