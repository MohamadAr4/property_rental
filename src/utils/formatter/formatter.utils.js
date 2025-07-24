export const formatPrismaResponse = (data) => {
  if (Array.isArray(data)) {
    return data.map(item => ({
      ...item,
      id: item.id.toString(),
    }));
  }
  return {
    ...data,
    id: data.id.toString(),
  };
};