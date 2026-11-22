// Block signature chains of the pages made before the CMS whose chain is not a standard layout (cms-plan Q5). Frozen:
// text, media and crop can change, block chain cannot; a new page cannot use "legacy".
export const LEGACY_LAYOUTS = {
  projects: {
    "can-ho-go-soi": ["hero-project#1", "section-title", "paragraph", "media-carousel#4", "facts-grid", "paragraph", "media-single:wide#1", "paragraph", "media-single:left-2-3#1", "paragraph", "paragraph", "project-slider", "cta-arrow", "contact-quick"],
    "nha-gieng-troi": ["hero-project#1", "section-title", "paragraph", "media-carousel#3", "facts-grid", "paragraph", "media-single:wide#1", "paragraph", "media-pair:left-large#2", "paragraph", "paragraph", "project-slider", "cta-arrow", "contact-quick"],
    "van-phong-lam-viec-chung": ["hero-project#1", "section-title", "paragraph", "facts-grid", "paragraph", "media-single:wide#1", "paragraph", "media-single:left-2-3#1", "paragraph", "media-carousel#3", "paragraph", "project-slider", "cta-arrow", "contact-quick"],
    "tiem-banh-ngot": ["hero-project#1", "section-title", "paragraph", "media-carousel#3", "facts-grid", "media-text#1", "paragraph", "media-single:wide#1", "paragraph", "media-single:left-2-3#1", "paragraph", "paragraph", "project-slider", "cta-arrow", "contact-quick"],
    "homestay-nha-go-ven-song": ["hero-project#1", "section-title", "paragraph", "media-carousel#3", "facts-grid", "paragraph", "media-single:right-2-3#1", "paragraph", "media-single:left-2-3#1", "paragraph", "media-pair:equal#2", "paragraph", "paragraph", "project-slider", "cta-arrow", "contact-quick"],
    "nha-pho-japandi-san-truoc": ["hero-project#1", "section-title", "paragraph", "media-carousel#3", "facts-grid", "paragraph", "media-single:right-2-3#1", "media-text#1", "paragraph", "media-pair:equal#2", "paragraph", "media-single:wide#1", "paragraph", "media-single:left-2-3#1", "paragraph", "paragraph", "project-slider", "cta-arrow", "contact-quick"],
  },
  news: {
    "nha-pho-giu-mat": ["paragraph", "media-single:wide#1", "paragraph", "media-pair:equal#2", "quote", "media-single:right-2-3#1", "contact-quick", "news-cards", "cta-arrow"],
  },
};
