import ImgGameMaster from '@assets/images/icons/aptitud.zeus.png';
import ImgParacaidismo from '@assets/images/icons/aptitud.para.png';
import ImgMedico from '@assets/images/icons/aptitud.medico.png';
import ImgTirador from '@assets/images/icons/aptitud.tirador.png';
import ImgFuerzasEspeciales from '@assets/images/icons/aptitud.ffee.png';
import ImgPeacekeeper from '@assets/images/icons/aptitud.peacekeeper.png';

// Single source of truth for the aptitude badges: the players.<key> boolean
// column, the display label, the hover description, and the badge artwork.
// Shared by the roster row, the player profile page, the admin edit form,
// and the admin table.
export const APTITUDES = [
  {
    key: 'apt_game_master', label: 'Game master', image: ImgGameMaster,
    description: 'Desarrolló contenido dentro del juego para la comunidad.',
  },
  {
    key: 'apt_paracaidismo', label: 'Paracaidismo', image: ImgParacaidismo,
    description: 'Completó un entrenamiento de paracaidismo avanzado.',
  },
  {
    key: 'apt_medico', label: 'Médico especialista', image: ImgMedico,
    description: 'Completó un entrenamiento de médico avanzado.',
  },
  {
    key: 'apt_tirador', label: 'Tirador especial', image: ImgTirador,
    description: 'Completó desafíos de tiro avanzados.',
  },
  {
    key: 'apt_fuerzas_especiales', label: 'Fuerzas especiales', image: ImgFuerzasEspeciales,
    description: 'Tiene experiencia en el juego y posee al menos 2 aptitudes avanzadas.',
  },
  {
    key: 'apt_peacekeeper', label: 'Peacekeeper', image: ImgPeacekeeper,
    description: 'Completó misiones humanitarias.',
  },
];
