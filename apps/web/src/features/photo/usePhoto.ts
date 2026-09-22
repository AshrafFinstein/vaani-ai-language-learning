import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type { StartPhotoSessionInput } from '@vaani/types';
import { photoApi } from './photo.api';

export function usePhotoSession(id: string | undefined) {
  return useQuery({
    queryKey: ['photo', 'detail', id],
    queryFn: () => photoApi.detail(id!),
    enabled: Boolean(id),
  });
}

export function useStartPhotoSession() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (input: StartPhotoSessionInput) => photoApi.start(input),
    onSuccess: (data) => {
      navigate(`/app/photo/${data.session.id}`);
    },
  });
}

export function usePhotoReply(id: string | undefined) {
  return useMutation({
    mutationFn: (content: string) => photoApi.send(id!, { content }),
  });
}
