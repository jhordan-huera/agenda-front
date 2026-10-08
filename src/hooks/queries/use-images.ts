import { useMutation } from "@tanstack/react-query";
import { useSession } from "@/features/auth/use-session";
import { data } from "@/lib/data";
import { IMAGE_TYPES } from "@/lib/validations/images";
import { shrinkImage, uploadToStorage } from "@/lib/upload";
import type { ImageTarget } from "@/types";

/** Lado mayor con que se guarda cada imagen: se ven pequeñas, no hace falta más. */
const MAX_SIZE: Record<ImageTarget, number> = { avatar: 512, professional: 512, logo: 800 };

/**
 * Sube un logo o una foto al almacenamiento de imágenes (reducida antes en el navegador) y
 * devuelve su dirección pública, que es lo que se guarda en el formulario.
 */
export function useUploadImage(target: ImageTarget) {
  const { session } = useSession();
  return useMutation({
    mutationFn: async (file: File) => {
      const image = await shrinkImage(file, MAX_SIZE[target]).catch(() => {
        throw new Error("No pudimos leer la imagen. Prueba con una foto JPG o PNG.");
      });
      const contentType = image.type as (typeof IMAGE_TYPES)[number];
      const { upload, url } = await data.images.requestUpload({
        target,
        businessId: target === "avatar" ? null : (session?.businessId ?? null),
        contentType,
        sizeBytes: image.size,
      });
      await uploadToStorage(upload, image, { contentType });
      return url;
    },
  });
}
