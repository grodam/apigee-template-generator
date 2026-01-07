import React from 'react';
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
  nextLabel = 'Next',
  showBack = true,
  showNext = true
}) => {
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
            Back
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
            {nextLabel}
          </Button>
        )}
      </Box>
    </Box>
  );
};
