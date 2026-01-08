import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button } from '@mui/material';
import { ArrowBack, ArrowForward } from '@mui/icons-material';

interface NavigationButtonsProps {
  onBack?: () => void;
  onNext?: () => void;
  backDisabled?: boolean;
  nextDisabled?: boolean;
  nextLabel?: string;
  showBack?: boolean;
  showNext?: boolean;
}

export const NavigationButtons: React.FC<NavigationButtonsProps> = ({
  onBack,
  onNext,
  backDisabled = false,
  nextDisabled = false,
  nextLabel,
  showBack = true,
  showNext = true
}) => {
  const { t } = useTranslation();

  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
      <Box>
        {showBack && (
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={onBack}
            disabled={backDisabled}
          >
            {t('common.back')}
          </Button>
        )}
      </Box>
      <Box>
        {showNext && (
          <Button
            variant="contained"
            endIcon={<ArrowForward />}
            onClick={onNext}
            disabled={nextDisabled}
          >
            {nextLabel || t('common.next')}
          </Button>
        )}
      </Box>
    </Box>
  );
};
