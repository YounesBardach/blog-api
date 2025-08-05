import toast from 'react-hot-toast';

export const getErrorMessage = (error) => {
  if (error?.response?.data) {
    const data = error.response.data;
    if (data.detail) {
      return data.detail;
    }
    if (data.title) {
      return data.title;
    }
    // Fallback for other error formats
    if (data.message) {
      return data.message;
    }
  }

  // Network or other errors
  if (error?.message) {
    return error.message;
  }

  return 'An unexpected error occurred';
};

// Toast notification functions
export const showSuccessToast = (message) => {
  toast.success(message);
};

export const showErrorToast = (error) => {
  const message = getErrorMessage(error);
  toast.error(message);
};

export const showLoadingToast = (message) => {
  return toast.loading(message);
};

export const dismissToast = (toastId) => {
  toast.dismiss(toastId);
};

export const showPromiseToast = (promise, { loading, success, error }) => {
  return toast.promise(promise, {
    loading,
    success,
    error: error || ((err) => getErrorMessage(err)),
  });
};
