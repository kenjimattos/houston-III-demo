import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export function CustomPagination({
  pagination,
  onPageChange,
}: {
  pagination: {
    currentPage: number;
    totalPages: number;
  };
  onPageChange: (page: number) => void;
}) {
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            isActive={pagination.currentPage > 1}
            onClick={() => {
              if (pagination.currentPage > 1) {
                return onPageChange(pagination.currentPage - 1);
              }
            }}
          />
        </PaginationItem>
        {/* Renderização inteligente dos links de página */}
        {(() => {
          const { currentPage, totalPages } = pagination;
          const maxVisiblePages = 10;

          // Se o total de páginas for menor ou igual ao máximo, mostrar todas
          if (totalPages <= maxVisiblePages) {
            return Array.from({ length: totalPages }, (_, i) => (
              <PaginationItem key={i}>
                <PaginationLink
                  isActive={currentPage === i + 1}
                  onClick={() => onPageChange(i + 1)}
                  className={[
                    "transition-colors",
                    currentPage === i + 1
                      ? "bg-primary/10 text-primary"
                      : "text-gray-600 hover:bg-gray-100",
                  ].join(" ")}
                >
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ));
          }

          // Lógica para páginas com ellipsis
          const pages = [];
          const showLeftEllipsis = currentPage > 6;
          const showRightEllipsis = currentPage < totalPages - 5;

          // Sempre mostrar primeira página
          pages.push(
            <PaginationItem key={1}>
              <PaginationLink
                isActive={currentPage === 1}
                onClick={() => onPageChange(1)}
                className={[
                  "transition-colors",
                  currentPage === 1
                    ? "bg-primary/10 text-primary"
                    : "text-gray-600 hover:bg-gray-100",
                ].join(" ")}
              >
                1
              </PaginationLink>
            </PaginationItem>
          );

          // Ellipsis à esquerda se necessário
          if (showLeftEllipsis) {
            pages.push(
              <PaginationItem key="left-ellipsis">
                <PaginationEllipsis />
              </PaginationItem>
            );
          }

          // Páginas ao redor da página atual
          let startPage = Math.max(2, currentPage - 3);
          let endPage = Math.min(totalPages - 1, currentPage + 3);

          // Ajustar range se estiver no início ou fim
          if (currentPage <= 6) {
            startPage = 2;
            endPage = Math.min(9, totalPages - 1);
          } else if (currentPage >= totalPages - 5) {
            startPage = Math.max(totalPages - 8, 2);
            endPage = totalPages - 1;
          }

          for (let i = startPage; i <= endPage; i++) {
            pages.push(
              <PaginationItem key={i}>
                <PaginationLink
                  isActive={currentPage === i}
                  onClick={() => onPageChange(i)}
                  className={[
                    "transition-colors",
                    currentPage === i
                      ? "bg-primary/10 text-primary"
                      : "text-gray-600 hover:bg-gray-100",
                  ].join(" ")}
                >
                  {i}
                </PaginationLink>
              </PaginationItem>
            );
          }

          // Ellipsis à direita se necessário
          if (showRightEllipsis) {
            pages.push(
              <PaginationItem key="right-ellipsis">
                <PaginationLink>
                  <PaginationEllipsis />
                </PaginationLink>
              </PaginationItem>
            );
          }

          // Sempre mostrar última página (se não for a primeira)
          if (totalPages > 1) {
            pages.push(
              <PaginationItem key={totalPages}>
                <PaginationLink
                  isActive={currentPage === totalPages}
                  onClick={() => onPageChange(totalPages)}
                  className={[
                    "transition-colors cursor-default",
                    currentPage === totalPages
                      ? "bg-primary/10 text-primary"
                      : "text-gray-600 hover:bg-gray-100",
                  ].join(" ")}
                >
                  {totalPages}
                </PaginationLink>
              </PaginationItem>
            );
          }

          return pages;
        })()}
        <PaginationItem>
          <PaginationNext
            isActive={pagination.currentPage < pagination.totalPages}
            onClick={() => {
              if (pagination.currentPage < pagination.totalPages) {
                return onPageChange(pagination.currentPage + 1);
              }
            }}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
