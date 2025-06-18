import React from 'react';

interface CategoryScrollProps {
  categories: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
  selectedCategoryId?: string;
  onCategorySelect?: (categoryId: string) => void;
  className?: string;
}

export function CategoryScroll({ 
  categories, 
  selectedCategoryId, 
  onCategorySelect,
  className = "" 
}: CategoryScrollProps) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  // Check scroll position and update scroll buttons
  const checkScrollPosition = React.useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  }, []);

  // Scroll to category
  const scrollToCategory = React.useCallback((categoryId: string) => {
    if (!scrollContainerRef.current) return;
    
    const categoryElement = document.getElementById(`category-${categoryId}`);
    if (categoryElement) {
      categoryElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start',
        inline: 'nearest'
      });
    }
  }, []);

  // Handle category click
  const handleCategoryClick = React.useCallback((categoryId: string) => {
    onCategorySelect?.(categoryId);
    scrollToCategory(categoryId);
  }, [onCategorySelect, scrollToCategory]);



  // Check scroll position on mount and when categories change
  React.useEffect(() => {
    checkScrollPosition();
    const handleResize = () => checkScrollPosition();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [checkScrollPosition, categories]);

  // If no categories, don't render anything
  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      {/* Left gradient indicator */}
      {canScrollLeft && (
        <div className="pointer-events-none hidden md:block absolute left-0 top-0 h-full w-8 z-10" style={{background: 'linear-gradient(to right, rgba(0,0,0,0.08) 60%, rgba(0,0,0,0))'}} />
      )}
      {/* Right gradient indicator */}
      {canScrollRight && (
        <div className="pointer-events-none hidden md:block absolute right-0 top-0 h-full w-8 z-10" style={{background: 'linear-gradient(to left, rgba(0,0,0,0.08) 60%, rgba(0,0,0,0))'}} />
      )}

      {/* Scroll container */}
      <div
        ref={scrollContainerRef}
        onScroll={checkScrollPosition}
        className="flex gap-3 overflow-x-auto scrollbar-hide px-4 md:px-0"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => handleCategoryClick(category.id)}
            className={`
              flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap
              focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0
              ${selectedCategoryId === category.id
                ? 'bg-black text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
              }
            `}
          >
            {category.name}
          </button>
        ))}
      </div>
    </div>
  );
} 