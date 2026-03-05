import React from 'react';
import ListView from './ListView';
import CardView from './CardView';

const CharacterList = ({ viewMode, ...props }) => {
  return (
    <div className={viewMode === 'list' ? "neo-card" : ""} style={viewMode === 'list' ? { padding: 0, overflow: 'hidden' } : {}}>
      {viewMode === 'list' ? (
        <ListView {...props} />
      ) : (
        <CardView {...props} />
      )}
    </div>
  );
};

export default React.memo(CharacterList);

