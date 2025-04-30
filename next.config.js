/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
      domains: [
        'raw.githubusercontent.com',  // For Pokemon images from PokeAPI
        'assets.pokemon.com',         // Alternative Pokemon image source
        'pokeapi.co'                  // PokeAPI domain
      ],
      // Optionally add a remote pattern for more flexibility
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'raw.githubusercontent.com',
          pathname: '/PokeAPI/sprites/**',
        },
      ],
    },
  };
  
  module.exports = nextConfig;